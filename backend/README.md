# Production Demo Data Generation

To populate the database with a realistic production-quality demo dataset, run:

`ash
python seed_production.py
``n
This script clears the current collections and inserts:
- 50 Hospitals
- 400 Doctors
- 800 Patients
- 50 Receptionists
- 10 Admins
- ~5000 Appointments
- Queues, Prescriptions, Medical Records, Notifications, and Medical Files.

The script uses the Faker library and Motor for asynchronous batch inserts to optimize performance.
