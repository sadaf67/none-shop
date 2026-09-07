from django.test import TestCase


class HealthEndpointTests(TestCase):
    def test_health_checks_database(self):
        response = self.client.get('/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')
