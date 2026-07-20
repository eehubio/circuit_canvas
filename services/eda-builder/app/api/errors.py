from fastapi import HTTPException


def not_found(job_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": f"Job not found: {job_id}"})


def conflict(code: str, message: str) -> HTTPException:
    return HTTPException(status_code=409, detail={"code": code, "message": message})
