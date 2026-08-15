from locust import HttpUser, task, between
import random

class HospitalQueueUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """
        In a real scenario, this would POST to /auth/login and retrieve a token.
        For this test, we assume public endpoints or mocked auth if needed.
        """
        self.client.headers.update({"Content-Type": "application/json"})
        
    @task(3)
    def view_live_queue(self):
        # We assume we have a few static doctor IDs for testing, or we just hit a generic route.
        # This will test the read-heavy queue endpoint.
        dummy_doctor_id = f"test_doc_{random.randint(1, 5)}"
        self.client.get(f"/api/queues/live/{dummy_doctor_id}")
        
    @task(1)
    def view_system_health(self):
        self.client.get("/api/system/health")

    @task(1)
    def simulate_search(self):
        queries = ["Cardiology", "Dr. Smith", "Central Hospital"]
        self.client.get(f"/api/search?q={random.choice(queries)}")
        
    # Example of a POST request load (e.g. creating an appointment request)
    # @task(1)
    # def request_appointment(self):
    #     self.client.post("/api/appointments/request", json={
    #         "doctor_id": "test_doc",
    #         "hospital_id": "test_hosp",
    #         "requested_slot": "2026-07-25T10:00:00Z",
    #         "notes": "Load testing request"
    #     })
