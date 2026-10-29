from fastapi.testclient import TestClient


def test_docs_available(client: TestClient) -> None:
    response = client.get("/api/docs")
    assert response.status_code == 200


def test_openapi_schema_has_title(client: TestClient) -> None:
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Dashboard API"
