-- Demo data. All names below are made up.
SET TIME ZONE 'Asia/Kolkata';

INSERT INTO movies (title, description, language, genre, duration_min, certificate, rating) VALUES
  ('Monsoon Heist',   'A crew of retired thieves plans one last job during the heaviest rain Mumbai has seen in years.', 'Hindi',   'Thriller', 142, 'UA', 8.4),
  ('The Last Signal', 'An astronaut alone on a dying station hears a voice that should not exist.',                      'English', 'Sci-Fi',   128, 'UA', 8.1),
  ('Pune Diaries',    'Four college friends, one old scooter and a summer that changes everything.',                      'Marathi', 'Drama',    121, 'U',  8.7),
  ('Orbit 9',         'A mission to a far moon goes wrong in the funniest possible way.',                                 'English', 'Comedy',   105, 'U',  7.6),
  ('Gully Champions', 'A street cricket team from a small town takes on the state league.',                               'Hindi',   'Sports',   138, 'U',  8.0),
  ('Silent Ghats',    'A forest officer chases a mystery deep in the Western Ghats.',                                    'Kannada', 'Mystery',  131, 'UA', 7.9);

INSERT INTO theaters (name, city, address) VALUES
  ('Galaxy Cinemas Kothrud',  'Pune',      'Paud Road, Kothrud'),
  ('Starlight Multiplex',     'Pune',      'Viman Nagar'),
  ('Marine View Talkies',     'Mumbai',    'Marine Drive'),
  ('Metro Max Andheri',       'Mumbai',    'Andheri West'),
  ('Lakeside Screens',        'Bengaluru', 'Indiranagar'),
  ('Silicon Cinemas',         'Bengaluru', 'Whitefield');

INSERT INTO screens (theater_id, name)
SELECT t.id, 'Screen ' || n FROM theaters t, generate_series(1, 2) n
ORDER BY t.id, n;  -- keeps both screens of a theater next to each other, so they play different movies

-- 10 rows (A-J) x 12 seats per screen
INSERT INTO seats (screen_id, row_label, seat_number, seat_type)
SELECT s.id, chr(64 + r), n,
       CASE WHEN r <= 6 THEN 'REGULAR' WHEN r <= 9 THEN 'PREMIUM' ELSE 'RECLINER' END
FROM screens s, generate_series(1, 10) r, generate_series(1, 12) n;

-- Shows are not created here. The server fills the next 4 days of shows
-- on start-up and every 6 hours (see src/services/showScheduler.ts).
