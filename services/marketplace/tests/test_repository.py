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
    # A row from before first-class sources carries no source columns.
    assert result["source"] is None


def test_entry_carries_source_record() -> None:
    result = _entry(
        {
            "id": "skill-id",
            "slug": "issuer",
            "status": "published",
            "source_id": "source-id",
            "source_url": "https://github.com/acme/skills",
            "source_owner": "acme",
            "source_repo": "skills",
            "source_status": "active",
            "org_id": "org-id",
            "org_slug": "acme",
            "org_name": "Acme",
            "org_website": None,
            "version": "1.0.0",
            "manifest": {},
            "decided_at": None,
        }
    )

    assert result["source"] == {
        "id": "source-id",
        "url": "https://github.com/acme/skills",
        "owner": "acme",
        "repo": "skills",
        "status": "active",
    }


def test_entry_keeps_same_slug_under_two_orgs_apart() -> None:
    # Skill names are unique per organisation; the org block carries the
    # isolation into the API shape.
    rows = [
        {
            "id": f"skill-{org}",
            "slug": "shared-skill",
            "status": "published",
            "org_id": f"org-{org}",
            "org_slug": org,
            "org_name": org.title(),
            "org_website": None,
            "version": "1.0.0",
            "manifest": {},
            "decided_at": None,
        }
        for org in ("igrant-io", "educhain-labs")
    ]

    entries = [_entry(row) for row in rows]

    assert [e["slug"] for e in entries] == ["shared-skill", "shared-skill"]
    assert [e["org"]["slug"] for e in entries] == ["igrant-io", "educhain-labs"]
    assert entries[0]["id"] != entries[1]["id"]


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
