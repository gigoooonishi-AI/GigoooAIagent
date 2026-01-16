variable "postgres_user" {
  description = "PostgreSQL user name"
  type        = string
  default     = "gigooo"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
  default     = "gigooo_secret_2026"
}

variable "postgres_db" {
  description = "PostgreSQL database name"
  type        = string
  default     = "gigooo_db"
}
