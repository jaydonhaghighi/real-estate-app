variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "db_tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "redis_tier" {
  type    = string
  default = "STANDARD_HA"
}

variable "api_image" {
  type    = string
  default = "gcr.io/cloudrun/hello"
}

variable "worker_image" {
  type    = string
  default = "gcr.io/cloudrun/hello"
}
