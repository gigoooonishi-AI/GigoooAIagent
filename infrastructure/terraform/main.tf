terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "npipe:////./pipe/dockerDesktopLinuxEngine"
}

# PostgreSQLイメージ
resource "docker_image" "postgres" {
  name         = "postgres:15-alpine"
  keep_locally = true
}

# データ永続化用ボリューム
resource "docker_volume" "postgres_data" {
  name = "gigooo_postgres_data"
}

# PostgreSQLコンテナ
resource "docker_container" "postgres" {
  name  = "gigooo_postgres"
  image = docker_image.postgres.image_id

  ports {
    internal = 5432
    external = 5432
  }

  env = [
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    "POSTGRES_DB=${var.postgres_db}"
  ]

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  restart = "unless-stopped"

  healthcheck {
    test         = ["CMD-SHELL", "pg_isready -U ${var.postgres_user} -d ${var.postgres_db}"]
    interval     = "10s"
    timeout      = "5s"
    retries      = 5
    start_period = "30s"
  }
}

# 出力
output "postgres_host" {
  value       = "localhost"
  description = "PostgreSQL host"
}

output "postgres_port" {
  value       = docker_container.postgres.ports[0].external
  description = "PostgreSQL port"
}

output "connection_string" {
  value       = "postgresql://${var.postgres_user}:${var.postgres_password}@localhost:5432/${var.postgres_db}"
  description = "PostgreSQL connection string"
  sensitive   = true
}
