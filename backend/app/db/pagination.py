MAX_LIMIT = 500


async def paginate_query(query, page: int = 1, limit: int = 20) -> dict:
    page = max(1, page)
    limit = max(1, min(MAX_LIMIT, limit))
    offset = (page - 1) * limit
    end = offset + limit - 1

    result = query.range(offset, end).execute()
    rows = result.data or []
    total = result.count if (hasattr(result, "count") and result.count is not None) else len(rows)

    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "data": rows,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }
