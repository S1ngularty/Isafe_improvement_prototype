from app.services.evacuation import rank_evacuation_areas


def test_rank_evacuation_areas_sorts_by_distance():
    areas = [
        {"id": 1, "name": "Far Area", "latitude": 14.6200, "longitude": 120.9900},
        {"id": 2, "name": "Near Area", "latitude": 14.6005, "longitude": 120.9847},
        {"id": 3, "name": "Closest Area", "latitude": 14.5998, "longitude": 120.9843},
    ]

    ranked = rank_evacuation_areas(areas, 14.5995, 120.9842)

    assert [item["name"] for item in ranked[:2]] == ["Closest Area", "Near Area"]
    assert ranked[0]["distance_km"] <= ranked[1]["distance_km"]
