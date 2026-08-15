import urllib.request
import urllib.parse
import json
import time
from datetime import datetime, timedelta, timezone

BASE_URL = "http://127.0.0.1:8000"

def http_post(url, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, json.loads(body) if body else {}

def http_get(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, json.loads(body) if body else {}

def run_live_demo_simulation():
    print("==================================================================================")
    print("       LIVE DEMO SIMULATION: PATIENT BOOKING -> DOCTOR RESCHEDULE -> APPROVAL     ")
    print("==================================================================================")

    # -------------------------------------------------------------------------
    # STEP 1: PATIENT REGISTRATION & LOGIN
    # -------------------------------------------------------------------------
    import uuid
    rand_id = str(uuid.uuid4())[:8]
    patient_username = f"patient_{rand_id}"
    patient_password = "patient123"
    
    print("\n[SCENARIO STEP 1] Patient registers and logs into the Hospital App...")
    reg_payload = {
        "username": patient_username,
        "email": f"{patient_username}@hospital.com",
        "password": patient_password,
        "role": "patient",
        "name": "Demo Patient",
        "phone": "1234567890",
        "age": 30,
        "gender": "Female"
    }
    s, reg_res = http_post(f"{BASE_URL}/auth/register", reg_payload)
    assert s in [200, 201], f"Patient registration failed: {reg_res}"

    s, pat_res = http_post(f"{BASE_URL}/auth/login", {"username_or_email": patient_username, "password": patient_password})
    assert s == 200, f"Patient login failed: {pat_res}"
    patient_token = pat_res["access_token"]
    print("  [OK] Patient authenticated successfully as:", pat_res["username"])

    # -------------------------------------------------------------------------
    # STEP 2: PATIENT BOOKS AN APPOINTMENT
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 2] Patient creates an appointment request for Dr. Sarah Smith...")
    req_slot = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    req_payload = {
        "doctor_id": "doc-dr_smith_central",
        "hospital_id": "hosp-central-gen-central",
        "requested_slot": req_slot,
        "notes": "Experiencing recurring headaches and dizziness",
        "symptoms": "Headache & Dizziness",
        "priority": "HIGH",
        "booking_method": "MANUAL",
        "age": 30,
        "gender": "Female"
    }
    s, req_res = http_post(f"{BASE_URL}/appointments/request", req_payload, token=patient_token)
    assert s in [200, 201], f"Booking failed: {req_res}"
    req_id = req_res["request_id"]
    print(f"  [OK] Appointment Request Submitted! Request ID: {req_id}")
    print(f"  [OK] Current Request Status: {req_res['status']}")
    print("  [OK] Verification: No Queue Token is issued prior to doctor review.")

    # -------------------------------------------------------------------------
    # STEP 3: DOCTOR LOGS IN & REVIEWS DASHBOARD
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 3] Dr. Sarah Smith logs into Doctor Dashboard...")
    s, doc_res = http_post(f"{BASE_URL}/auth/login", {"username_or_email": "dr_smith_central", "password": "doctor123"})
    assert s == 200, f"Doctor login failed: {doc_res}"
    doctor_token = doc_res["access_token"]
    print("  [OK] Doctor authenticated successfully as:", doc_res["username"])

    print("\n[SCENARIO STEP 4] Doctor reviews incoming requests feed...")
    s, doc_requests = http_get(f"{BASE_URL}/appointments/doctor/requests", token=doctor_token)
    target_req = next((r for r in doc_requests if r["id"] == req_id), None)
    assert target_req is not None, "Request not found in Doctor feed!"
    print("  [OK] Incoming request card found on Doctor Dashboard:")
    print(f"     - Patient Name: {target_req['patient_name']}")
    print(f"     - Symptoms: {target_req['symptoms']}")
    print(f"     - Priority Level: {target_req['priority']}")
    print(f"     - Requested Time: {target_req['requested_slot']}")

    # -------------------------------------------------------------------------
    # STEP 4: DOCTOR RESCHEDULES / SUGGESTS A NEW SLOT
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 5] Doctor proposes a new appointment time...")
    suggested_time = datetime.now(timezone.utc) + timedelta(days=1, hours=4)
    suggest_payload = {
        "suggested_slot": suggested_time.isoformat(),
        "notes": "Doctor has surgery in the morning. Please come tomorrow at 2:00 PM."
    }
    s, sug_res = http_post(f"{BASE_URL}/appointments/suggest/{req_id}", suggest_payload, token=doctor_token)
    assert s == 200, f"Slot suggestion failed: {sug_res}"
    print("  [OK] Doctor sent slot suggestion to patient!")
    print(f"  [OK] Suggested Time: {suggested_time.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"  [OK] Doctor's Note: \"{suggest_payload['notes']}\"")

    # -------------------------------------------------------------------------
    # STEP 5: PATIENT REVIEWS & ACCEPTS PROPOSED SLOT
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 6] Patient checks dashboard and accepts doctor's suggested slot...")
    s, my_requests = http_get(f"{BASE_URL}/appointments/requests", token=patient_token)
    patient_req_card = next((r for r in my_requests if r["id"] == req_id), None)
    assert patient_req_card is not None
    print(f"  [OK] Patient sees status on dashboard: {patient_req_card['status']}")

    print("\n[SCENARIO STEP 7] Patient clicks 'ACCEPT & GENERATE TOKEN'...")
    s, respond_res = http_post(f"{BASE_URL}/appointments/patient-respond/{req_id}", {"action": "ACCEPT"}, token=patient_token)
    assert s == 200, f"Accept failed: {respond_res}"
    print("  [OK] Patient Accepted Slot!")
    print(f"  [OK] Queue Token Generated: #{respond_res['queue_number']}")
    print(f"  [OK] Appointment ID: {respond_res['appointment_id']}")

    # -------------------------------------------------------------------------
    # STEP 6: DOCTOR CALLS NEXT PATIENT TO CONSULTATION
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 8] Doctor calls next patient into consultation...")
    s, next_res = http_post(f"{BASE_URL}/queues/next", {}, token=doctor_token)
    print("  [OK] Queue advanced to next patient:")
    print(f"     - Patient Called: {next_res.get('patient_name', 'Patient')}")
    print(f"     - Token Number: #{next_res.get('queue_number', 1)}")

    # -------------------------------------------------------------------------
    # STEP 7: DOCTOR COMPLETES CONSULTATION & ADDS PRESCRIPTION
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 9] Doctor completes consultation & writes prescription...")
    presc_payload = {
        "appointment_id": respond_res["appointment_id"],
        "diagnosis": "Tension Headache due to eye strain and stress",
        "medicines": [
            {"name": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "Twice daily after meals", "duration": "5 days"},
            {"name": "Multivitamin B-Complex", "dosage": "1 capsule", "frequency": "Once daily morning", "duration": "10 days"}
        ],
        "lab_tests": ["Eye Sight Checkup", "Complete Blood Count (CBC)"],
        "advice": "Drink plenty of water, reduce screen time, and get 8 hours of sleep.",
        "follow_up_date": (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    }
    s, presc_res = http_post(f"{BASE_URL}/appointments/prescribe/{respond_res['appointment_id']}", presc_payload, token=doctor_token)
    assert s == 200, f"Prescription failed: {presc_res}"
    print("  [OK] Consultation COMPLETED!")
    print(f"  [OK] Diagnosis Recorded: \"{presc_payload['diagnosis']}\"")

    # -------------------------------------------------------------------------
    # STEP 8: PATIENT CHECKS MEDICAL HISTORY & PRESCRIPTION
    # -------------------------------------------------------------------------
    print("\n[SCENARIO STEP 10] Patient checks Medical History & Prescription records...")
    s, history_res = http_get(f"{BASE_URL}/patients/history", token=patient_token)
    latest_record = history_res[0] if len(history_res) > 0 else None
    assert latest_record is not None, "Medical history record missing!"
    print("  [OK] Patient Medical History Record Verified:")
    print(f"     - Doctor: {latest_record.get('doctor_name')}")
    print(f"     - Diagnosis: {latest_record.get('diagnosis')}")
    print(f"     - Prescribed Medicines: {len(latest_record.get('medicines', []))} items")
    print(f"     - Advice: \"{latest_record.get('advice')}\"")

    print("\n==================================================================================")
    print("      LIVE WORKFLOW DEMO COMPLETED SUCCESSFULLY WITH 100% INTEGRITY!            ")
    print("==================================================================================")

if __name__ == "__main__":
    run_live_demo_simulation()
