output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "worker_service" {
  value = google_cloud_run_v2_service.worker.name
}

output "postgres_instance" {
  value = google_sql_database_instance.postgres.name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "kms_key" {
  value = google_kms_crypto_key.raw.id
}
