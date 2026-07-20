FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app ./app

ENV EDA_BUILDER_HOST=0.0.0.0
ENV EDA_BUILDER_PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host ${EDA_BUILDER_HOST} --port ${EDA_BUILDER_PORT}"]
