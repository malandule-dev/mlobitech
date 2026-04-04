-- ══════════════════════════════════════════════════════
--  MM-INNOVATION TECH — MySQL Database Schema
--  Run this file once to set up your database.
--  Command: mysql -u root -p < database.sql
-- ══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS mm_innovation;
USE mm_innovation;

-- ── USERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,  -- bcrypt hashed
  role        ENUM('admin','user') DEFAULT 'user',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── CONTACT FORM SUBMISSIONS ──────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  message     TEXT NOT NULL,
  status      ENUM('unread','read') DEFAULT 'unread',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── BLOG POSTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  tag         VARCHAR(80),
  excerpt     TEXT,
  content     LONGTEXT,
  image_url   VARCHAR(255),
  author      VARCHAR(100) DEFAULT 'MM-IT Team',
  published   TINYINT(1) DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── TESTIMONIALS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(150),
  message     TEXT NOT NULL,
  rating      TINYINT DEFAULT 5,
  type        ENUM('client','intern') DEFAULT 'client',
  image_url   VARCHAR(255) DEFAULT 'images/user1.jpg',
  approved    TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SEED: Default Admin User ───────────────────────────
-- Password is: admin123  (change this immediately!)
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@mm-innovation.com',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHi2', 'admin');

-- ── SEED: Sample Blog Posts ───────────────────────────
INSERT INTO blog_posts (title, tag, excerpt, image_url, author) VALUES
('Top AI Trends Reshaping Business in 2024', 'Artificial Intelligence',
 'Explore how machine learning, NLP, and generative AI are transforming industries from finance to healthcare.',
 'images/pexels-joshsorenson-1714208.jpg', 'MM-IT Team'),
('Why Progressive Web Apps Are the Future', 'Web Development',
 'PWAs combine the best of web and mobile — fast, reliable, and engaging without app store friction.',
 'images/pexels-divinetechygirl-1181675.jpg', 'MM-IT Team'),
('Building a Culture of Innovation in Your Tech Team', 'Innovation',
 'Innovation doesn\'t happen by accident. Here are the strategies we use internally to keep ideas flowing.',
 'images/pexels-ola-dapo-1754561-3345882.jpg', 'MM-IT Team');

-- ── SEED: Sample Testimonials ─────────────────────────
INSERT INTO testimonials (name, role, message, rating, type, image_url, approved) VALUES
('John M.', 'CEO, Tech Innovators Inc.',
 'Working with MM-INNOVATION TECH has been an absolute game-changer. Their AI approach improved our operational efficiency.',
 4, 'client', 'images/user1.jpg', 1),
('David P.', 'CTO, FinTech Innovations',
 'The team truly understands user-friendly design and seamless integration. Our app received outstanding feedback.',
 5, 'client', 'images/user2.jpg', 1),
('Emma R.', 'Software Development Intern',
 'My internship was an incredible learning experience. The supportive environment helped me grow technically and personally.',
 4, 'intern', 'images/user1.jpg', 1);
