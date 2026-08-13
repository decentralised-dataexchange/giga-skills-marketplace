from datetime import UTC, datetime
from uuid import UUID

from marketplace.repository import _entry, _provider_entry


def test_entry_preserves_node_catalog_shape() -> None:
    result = _entry(
        {
            "id": UUID("531b5b2f-66cb-409f-a1c6-b7a203b062b6"),
            "slug": "issuer",
            "status": "published",
            "org_id": UUID("d38fec59-2210-4df9-beb5-17fc6515d166"),
            "org_slug": None,
            "org_name": "Provider",
            "org_website": None,
            "version": "1.0.0",
            "manifest": {
                "description": "Issue credentials",
                "metadata": {"protocols": "OpenID4VCI, W3C-VC"},
            },
            "decided_at": datetime(2026, 8, 5, 5, 39, 53, 229071, tzinfo=UTC),
        }
    )
    assert result["protocols"] == ["OpenID4VCI", "W3C-VC"]
    assert result["publishedAt"] == "2026-08-05T05:39:53.229Z"


def test_provider_entry_converts_postgres_counts() -> None:
    result = _provider_entry(
        {
            "id": UUID("d38fec59-2210-4df9-beb5-17fc6515d166"),
            "name": "Provider",
            "slug": None,
            "logo": None,
            "website": None,
            "description": None,
            "skill_count": 3,
        }
    )

    assert result["description"] == ""
    assert result["skillCount"] == 3


def test_entry_tolerates_non_object_manifest_fields() -> None:
    result = _entry(
        {
            "id": "skill-id",
            "slug": "skill",
            "status": "published",
            "org_id": "org-id",
            "org_slug": "org",
            "org_name": "Provider",
            "org_website": None,
            "version": "1.0.0",
            "manifest": {"targets": [], "metadata": "invalid"},
            "decided_at": None,
        }
    )

    assert result["protocols"] == []
