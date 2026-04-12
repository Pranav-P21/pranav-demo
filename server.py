"""
server.py — Flask Backend for Tuition Class Website
Serves the frontend + provides REST API with MySQL database.
"""

import os
import json
import hashlib
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

# ─── Configuration ───────────────────────────────────────────
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', 'mysql'),
    'database': os.environ.get('DB_NAME', 'tuition_db'),
    'port': int(os.environ.get('DB_PORT', 3306))
}
app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'tuition-admin-secret-key-change-in-production'
CORS(app)


# ─── Database Helpers ────────────────────────────────────────

def get_db():
    """Get a database connection."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Database connection error: {e}")
        return None


def query_db(sql, params=None, fetchone=False, commit=False):
    """Execute a query and return results."""
    conn = get_db()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        if commit:
            conn.commit()
            return cursor.lastrowid
        if fetchone:
            return cursor.fetchone()
        return cursor.fetchall()
    except Error as e:
        print(f"Query error: {e}")
        return None
    finally:
        conn.close()


def hash_password(password):
    """Simple SHA256 hash for passwords."""
    return hashlib.sha256(password.encode()).hexdigest()


# ─── Auth Decorator ──────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


# ─── Static File Serving ─────────────────────────────────────

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


# ═══════════════════════════════════════════════════════════════
#  AUTH API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')

    admin = query_db(
        'SELECT * FROM admin_users WHERE username = %s AND password = %s',
        (username, hash_password(password)),
        fetchone=True
    )

    if admin:
        session['admin_logged_in'] = True
        session['admin_id'] = admin['id']
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    return jsonify({'authenticated': session.get('admin_logged_in', False)})


@app.route('/api/change-password', methods=['POST'])
@admin_required
def change_password():
    data = request.json
    current = data.get('current_password', '')
    new_pass = data.get('new_password', '')

    admin = query_db(
        'SELECT * FROM admin_users WHERE id = %s AND password = %s',
        (session['admin_id'], hash_password(current)),
        fetchone=True
    )

    if not admin:
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

    query_db(
        'UPDATE admin_users SET password = %s WHERE id = %s',
        (hash_password(new_pass), session['admin_id']),
        commit=True
    )
    return jsonify({'success': True, 'message': 'Password updated'})


# ═══════════════════════════════════════════════════════════════
#  SITE INFO API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/site-info', methods=['GET'])
def get_site_info():
    rows = query_db('SELECT setting_key, setting_value FROM site_info')
    if rows is None:
        return jsonify({}), 500
    info = {}
    for row in rows:
        try:
            info[row['setting_key']] = json.loads(row['setting_value'])
        except (json.JSONDecodeError, TypeError):
            info[row['setting_key']] = row['setting_value']
    return jsonify(info)


@app.route('/api/site-info', methods=['PUT'])
@admin_required
def update_site_info():
    data = request.json
    for key, value in data.items():
        val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        existing = query_db(
            'SELECT id FROM site_info WHERE setting_key = %s',
            (key,), fetchone=True
        )
        if existing:
            query_db(
                'UPDATE site_info SET setting_value = %s WHERE setting_key = %s',
                (val_str, key), commit=True
            )
        else:
            query_db(
                'INSERT INTO site_info (setting_key, setting_value) VALUES (%s, %s)',
                (key, val_str), commit=True
            )
    return jsonify({'success': True, 'message': 'Site info updated'})


# ═══════════════════════════════════════════════════════════════
#  COURSES API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/courses', methods=['GET'])
def get_courses():
    courses = query_db('SELECT * FROM courses ORDER BY id ASC')
    return jsonify(courses or [])


@app.route('/api/courses', methods=['POST'])
@admin_required
def add_course():
    data = request.json
    new_id = query_db(
        'INSERT INTO courses (name, category, description, icon) VALUES (%s, %s, %s, %s)',
        (data['name'], data['category'], data.get('description', ''), data.get('icon', '📖')),
        commit=True
    )
    return jsonify({'success': True, 'id': new_id, 'message': 'Course added'})


@app.route('/api/courses/<int:course_id>', methods=['PUT'])
@admin_required
def update_course(course_id):
    data = request.json
    query_db(
        'UPDATE courses SET name=%s, category=%s, description=%s, icon=%s WHERE id=%s',
        (data['name'], data['category'], data.get('description', ''), data.get('icon', '📖'), course_id),
        commit=True
    )
    return jsonify({'success': True, 'message': 'Course updated'})


@app.route('/api/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def delete_course(course_id):
    query_db('DELETE FROM courses WHERE id = %s', (course_id,), commit=True)
    return jsonify({'success': True, 'message': 'Course deleted'})


# ═══════════════════════════════════════════════════════════════
#  DEGREE OPTIONS API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/degree-options', methods=['GET'])
def get_degree_options():
    options = query_db('SELECT * FROM degree_options ORDER BY id ASC')
    return jsonify(options or [])


@app.route('/api/degree-options', methods=['POST'])
@admin_required
def add_degree_option():
    data = request.json
    new_id = query_db(
        'INSERT INTO degree_options (name) VALUES (%s)',
        (data['name'],), commit=True
    )
    return jsonify({'success': True, 'id': new_id, 'message': 'Degree option added'})


@app.route('/api/degree-options/<int:option_id>', methods=['DELETE'])
@admin_required
def delete_degree_option(option_id):
    query_db('DELETE FROM degree_options WHERE id = %s', (option_id,), commit=True)
    return jsonify({'success': True, 'message': 'Degree option deleted'})


# ═══════════════════════════════════════════════════════════════
#  RESULTS API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/results', methods=['GET'])
def get_results():
    results = query_db('SELECT * FROM results ORDER BY year DESC, percentage DESC')
    return jsonify(results or [])


@app.route('/api/results', methods=['POST'])
@admin_required
def add_result():
    data = request.json
    new_id = query_db(
        '''INSERT INTO results (name, board, exam_class, year, percentage, details, image_url, category, stream)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        (data['name'], data['board'], data['examClass'], data['year'],
         data['percentage'], data.get('details', ''), data.get('imageUrl', ''),
         data['category'], data.get('stream', '')),
        commit=True
    )
    return jsonify({'success': True, 'id': new_id, 'message': 'Topper added'})


@app.route('/api/results/<int:result_id>', methods=['PUT'])
@admin_required
def update_result(result_id):
    data = request.json
    query_db(
        '''UPDATE results SET name=%s, board=%s, exam_class=%s, year=%s, percentage=%s,
           details=%s, image_url=%s, category=%s, stream=%s WHERE id=%s''',
        (data['name'], data['board'], data['examClass'], data['year'],
         data['percentage'], data.get('details', ''), data.get('imageUrl', ''),
         data['category'], data.get('stream', ''), result_id),
        commit=True
    )
    return jsonify({'success': True, 'message': 'Topper updated'})


@app.route('/api/results/<int:result_id>', methods=['DELETE'])
@admin_required
def delete_result(result_id):
    query_db('DELETE FROM results WHERE id = %s', (result_id,), commit=True)
    return jsonify({'success': True, 'message': 'Result deleted'})


# ═══════════════════════════════════════════════════════════════
#  GOVT EXAMS API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/govt-exams', methods=['GET'])
def get_govt_exams():
    exams = query_db('SELECT * FROM govt_exams ORDER BY id ASC')
    return jsonify(exams or [])


@app.route('/api/govt-exams', methods=['POST'])
@admin_required
def add_govt_exam():
    data = request.json
    new_id = query_db(
        'INSERT INTO govt_exams (name, description, details, icon) VALUES (%s, %s, %s, %s)',
        (data['name'], data.get('description', ''), data.get('details', ''), data.get('icon', '📋')),
        commit=True
    )
    return jsonify({'success': True, 'id': new_id, 'message': 'Exam added'})


@app.route('/api/govt-exams/<int:exam_id>', methods=['PUT'])
@admin_required
def update_govt_exam(exam_id):
    data = request.json
    query_db(
        'UPDATE govt_exams SET name=%s, description=%s, details=%s, icon=%s WHERE id=%s',
        (data['name'], data.get('description', ''), data.get('details', ''), data.get('icon', '📋'), exam_id),
        commit=True
    )
    return jsonify({'success': True, 'message': 'Exam updated'})


@app.route('/api/govt-exams/<int:exam_id>', methods=['DELETE'])
@admin_required
def delete_govt_exam(exam_id):
    query_db('DELETE FROM govt_exams WHERE id = %s', (exam_id,), commit=True)
    return jsonify({'success': True, 'message': 'Exam deleted'})


# ═══════════════════════════════════════════════════════════════
#  APPLICATIONS API
# ═══════════════════════════════════════════════════════════════

@app.route('/api/applications', methods=['GET'])
@admin_required
def get_applications():
    apps = query_db('SELECT * FROM applications ORDER BY submitted_at DESC')
    # Convert datetime to string
    if apps:
        for a in apps:
            if a.get('submitted_at'):
                a['submitted_at'] = a['submitted_at'].isoformat()
    return jsonify(apps or [])


@app.route('/api/applications', methods=['POST'])
def submit_application():
    """Public endpoint — anyone can submit an application."""
    data = request.json
    new_id = query_db(
        '''INSERT INTO applications (student_name, mobile, email, category, board, class_or_course, stream, status, submitted_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
        (data['studentName'], data['mobile'], data.get('email', ''),
         data['category'], data.get('board', ''), data.get('classOrCourse', ''),
         data.get('stream', ''), 'New', datetime.now()),
        commit=True
    )
    return jsonify({'success': True, 'id': new_id, 'message': 'Application submitted'})


@app.route('/api/applications/<int:app_id>', methods=['PUT'])
@admin_required
def update_application(app_id):
    data = request.json
    query_db(
        'UPDATE applications SET status = %s WHERE id = %s',
        (data['status'], app_id),
        commit=True
    )
    return jsonify({'success': True, 'message': 'Application updated'})


@app.route('/api/applications/<int:app_id>', methods=['DELETE'])
@admin_required
def delete_application(app_id):
    query_db('DELETE FROM applications WHERE id = %s', (app_id,), commit=True)
    return jsonify({'success': True, 'message': 'Application deleted'})


@app.route('/api/applications/count', methods=['GET'])
@admin_required
def get_app_count():
    result = query_db("SELECT COUNT(*) as total, SUM(status='New') as new_count FROM applications", fetchone=True)
    return jsonify(result or {'total': 0, 'new_count': 0})


# ═══════════════════════════════════════════════════════════════
#  BOARDS & STREAMS (static config, served from DB)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/boards', methods=['GET'])
def get_boards():
    boards = query_db('SELECT * FROM boards ORDER BY id ASC')
    return jsonify(boards or [])


@app.route('/api/streams', methods=['GET'])
def get_streams():
    return jsonify(['Science', 'Commerce', 'Arts'])


# ═══════════════════════════════════════════════════════════════
#  STATS (for admin dashboard)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
@admin_required
def get_stats():
    courses = query_db('SELECT COUNT(*) as count FROM courses', fetchone=True)
    results = query_db('SELECT COUNT(*) as count FROM results', fetchone=True)
    apps = query_db("SELECT COUNT(*) as total, SUM(status='New') as new_count FROM applications", fetchone=True)
    exams = query_db('SELECT COUNT(*) as count FROM govt_exams', fetchone=True)

    return jsonify({
        'courses': courses['count'] if courses else 0,
        'results': results['count'] if results else 0,
        'applications': apps['total'] if apps else 0,
        'newApplications': int(apps['new_count'] or 0) if apps else 0,
        'govtExams': exams['count'] if exams else 0
    })


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("=" * 50)
    print("  Tuition Class Website Server")
    print("  http://localhost:5000")
    print("  Admin: http://localhost:5000/admin.html")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
