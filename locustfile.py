from locust import HttpUser, task, between
import random

class DeKUTUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        # Login as student
        res = self.client.post("/auth/login", json={
            "email": "john@students.dkut.ac.ke",
            "password": "Test1234!"
        })
        if res.status_code == 200:
            self.token = res.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def browse_projects(self):
        self.client.get("/projects", headers=self.headers)

    @task(2)
    def get_my_applications(self):
        self.client.get("/applications/mine", headers=self.headers)

    @task(2)
    def get_notifications(self):
        self.client.get("/notifications", headers=self.headers)

    @task(1)
    def get_my_profile(self):
        self.client.get("/students/profile", headers=self.headers)

    @task(1)
    def get_showcase(self):
        self.client.get("/personal-projects")

    @task(1)
    def get_root(self):
        self.client.get("/")
