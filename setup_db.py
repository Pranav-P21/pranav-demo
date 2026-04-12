"""
setup_db.py — Supabase/PostgreSQL version.
Creates all tables and seeds default data using psycopg2.

SETUP:
1. pip install psycopg2-binary
2. Fill in your Supabase DB credentials below (from Supabase → Settings → Database)
3. Run ONCE before starting the server: python setup_db.py
"""

import psycopg2
from psycopg2 import Error
import hashlib

# ─── Supabase PostgreSQL Connection ─────────────────────────────────────────
# Get these from: Supabase Dashboard → Settings → Database → Connection parameters
DB_CONFIG = {
    'host':     'db.kqsjcntdhaolojzupcmx.supabase.co',   # e.g. db.abcxyz.supabase.co
    'port':      5432,
    'dbname':   'postgres',
    'user':     'postgres',
    'password': '5jztyn7rrc64716930',                   # Set when you created the project
    'sslmode':  'require'                             # Required for Supabase
}
# ─────────────────────────────────────────────────────────────────────────────


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def run():
    conn = None
    try:
        print("Connecting to Supabase PostgreSQL...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cursor = conn.cursor()

        # ─── Create Tables ───────────────────────────────────────────────────

        print("Creating tables...")

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_users (
                id       SERIAL PRIMARY KEY,
                username VARCHAR(50)  UNIQUE NOT NULL,
                password VARCHAR(64)  NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS site_info (
                id            SERIAL PRIMARY KEY,
                setting_key   VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS courses (
                id          SERIAL PRIMARY KEY,
                name        VARCHAR(200) NOT NULL,
                category    VARCHAR(50)  NOT NULL,
                description TEXT,
                icon        VARCHAR(10)  DEFAULT '📖'
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS degree_options (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS boards (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS results (
                id         SERIAL PRIMARY KEY,
                name       VARCHAR(200) NOT NULL,
                board      VARCHAR(50),
                exam_class VARCHAR(20),
                year       INT,
                percentage NUMERIC(5,2),
                details    TEXT,
                image_url  TEXT,
                category   VARCHAR(50),
                stream     VARCHAR(50)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS govt_exams (
                id          SERIAL PRIMARY KEY,
                name        VARCHAR(200) NOT NULL,
                description TEXT,
                details     TEXT,
                icon        VARCHAR(10)  DEFAULT '📋'
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS applications (
                id              SERIAL PRIMARY KEY,
                student_name    VARCHAR(200) NOT NULL,
                mobile          VARCHAR(20),
                email           VARCHAR(200),
                category        VARCHAR(100),
                board           VARCHAR(50),
                class_or_course VARCHAR(200),
                stream          VARCHAR(50),
                status          VARCHAR(50)  DEFAULT 'New',
                submitted_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # ─── Seed Data ───────────────────────────────────────────────────────

        cursor.execute('SELECT COUNT(*) FROM admin_users')
        if cursor.fetchone()[0] == 0:
            print("Seeding default data...")

            # Admin user (default: admin / admin123)
            cursor.execute(
                'INSERT INTO admin_users (username, password) VALUES (%s, %s)',
                ('admin', hash_password('admin123'))
            )

            # Site info
            site_defaults = {
                'companyName':    'Lucky Tutorials',
                'tagline':        'Empowering Students, Shaping Futures',
                'ownerName':      'Prof. Shaktiraj Kapoor',
                'ownerTitle':     'Founder & Head Tutor',
                'phone':          '+91 98765 43210',
                'email':          'info@luckytutorials.com',
                'address':        'Mumbai 400104',
                'logoUrl':        '',
                'ownerImageUrl':  '',
                'socialFacebook': '#',
                'socialInstagram':'#',
                'socialYoutube':  '#',
                'socialWhatsapp': '#'
            }
            for key, value in site_defaults.items():
                cursor.execute(
                    'INSERT INTO site_info (setting_key, setting_value) VALUES (%s, %s)',
                    (key, value)
                )

            # Boards
            for board in ['SSC', 'CBSE', 'ICSE', 'IGCSE']:
                cursor.execute('INSERT INTO boards (name) VALUES (%s)', (board,))

            # Courses
            courses = [
                ('School Tuition (1–10)', 'school',
                 'Comprehensive coaching for all subjects from Class 1 to 10 across all boards.', '📚'),
                ('Junior College (11–12)', 'junior',
                 'Expert guidance for Science, Commerce & Arts streams for 11th and 12th.', '🎓'),
                ('Degree College', 'degree',
                 'Specialized tutoring for undergraduate courses including B.Com, B.Sc, BBA & more.', '🏛️'),
                ('Govt Exam Preparation', 'govt',
                 'Structured preparation for MPSC, UPSC, SSC, Banking and Railway exams.', '🏆'),
                ('Mathematics Special', 'school',
                 'Intensive math coaching with problem-solving workshops and practice tests.', '🔢'),
                ('Science Lab & Theory', 'junior',
                 'Hands-on practical sessions combined with strong theoretical foundation.', '🔬')
            ]
            for name, cat, desc, icon in courses:
                cursor.execute(
                    'INSERT INTO courses (name, category, description, icon) VALUES (%s, %s, %s, %s)',
                    (name, cat, desc, icon)
                )

            # Degree Options
            degree_opts = [
                'B.Com (Bachelor of Commerce)',
                'B.Sc (Bachelor of Science)',
                'BBA (Bachelor of Business Administration)',
                'BA (Bachelor of Arts)',
                'BCA (Bachelor of Computer Applications)',
                'B.Tech (Bachelor of Technology)',
                'B.Pharm (Bachelor of Pharmacy)',
                'BMS (Bachelor of Management Studies)'
            ]
            for opt in degree_opts:
                cursor.execute('INSERT INTO degree_options (name) VALUES (%s)', (opt,))

            # Results
            results_data = [
                ('Ananya Deshmukh', 'SSC',  '10th', 2025, 98.4,
                 'School topper with distinction in all subjects. Secured highest marks in Mathematics.',
                 '', 'school', ''),
                ('Rohan Mehta',     'CBSE', '10th', 2025, 97.8,
                 'CBSE board topper. Scored perfect 100 in Science and Mathematics.',
                 '', 'school', ''),
                ('Priya Kulkarni',  'ICSE', '10th', 2025, 96.5,
                 'ICSE topper with excellent performance in English and Computer Science.',
                 '', 'school', ''),
                ('Arjun Patil',     'SSC',  '12th', 2025, 95.2,
                 'HSC Science topper. Secured admission in IIT Bombay.',
                 '', 'college', 'Science'),
                ('Sneha Joshi',     'CBSE', '12th', 2025, 97.0,
                 'Commerce topper. Scored 100 in Accountancy. Pursuing CA.',
                 '', 'college', 'Commerce'),
                ('Vikram Singh',    'SSC',  '10th', 2024, 96.8,
                 'Previous year topper with distinction in all subjects.',
                 '', 'school', ''),
                ('Kavita Rao',      'CBSE', '12th', 2024, 96.2,
                 'Science stream topper. Selected for NEET with excellent rank.',
                 '', 'college', 'Science')
            ]
            for r in results_data:
                cursor.execute(
                    '''INSERT INTO results
                       (name, board, exam_class, year, percentage, details, image_url, category, stream)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''', r
                )

            # Govt Exams
            govt_exams = [
                ('MPSC Preparation',
                 'Complete preparation for Maharashtra Public Service Commission exams.',
                 'Duration: 12 months | Covers: Prelims + Mains + Interview | Study material included', '🏛️'),
                ('UPSC / IAS',
                 'Expert coaching for Civil Services examination.',
                 'Duration: 18 months | Covers: Prelims + Mains + Personality Test | Current affairs daily', '⚖️'),
                ('SSC CGL / CHSL',
                 'Preparation for Staff Selection Commission exams.',
                 'Duration: 6 months | Covers: Tier 1 + Tier 2 | Mock tests weekly', '📋'),
                ('Banking (IBPS / SBI)',
                 'Comprehensive coaching for banking sector examinations.',
                 'Duration: 6 months | Covers: PO + Clerk | Quantitative aptitude focus', '🏦'),
                ('Railway (RRB)',
                 'Preparation for Railway Recruitment Board exams.',
                 'Duration: 4 months | Covers: NTPC + Group D | GK & reasoning focus', '🚂'),
                ('Defence (CDS / NDA)',
                 'Coaching for Combined Defence Services & National Defence Academy.',
                 'Duration: 8 months | Covers: Written + SSB Interview | Physical fitness guidance', '🎖️')
            ]
            for name, desc, details, icon in govt_exams:
                cursor.execute(
                    'INSERT INTO govt_exams (name, description, details, icon) VALUES (%s, %s, %s, %s)',
                    (name, desc, details, icon)
                )

            conn.commit()
            print("✅ Default data seeded successfully!")
        else:
            conn.commit()
            print("ℹ️  Data already exists, skipping seed.")

        print("\n✅ Supabase database is ready!")
        print("   Tables created: admin_users, site_info, courses, degree_options,")
        print("                   boards, results, govt_exams, applications")
        print("\n   Default admin login: admin / admin123")
        print("\n   Now run: python server.py")

    except Error as e:
        if conn:
            conn.rollback()
        print(f"\n❌ Error: {e}")
        print("\nCheck your DB_CONFIG credentials in this file.")
        print("Get them from: Supabase Dashboard → Settings → Database")
    finally:
        if conn:
            cursor.close()
            conn.close()


if __name__ == '__main__':
    run()
