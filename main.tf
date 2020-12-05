terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = "2.3.0"
    }
  }
}

variable "do_token" {
    type = string
}

data "digitalocean_ssh_key" "wsl" {
    name = "WSL Ubuntu"
}

provider "digitalocean" {
    token = var.do_token
}

resource "digitalocean_droplet" "droplet" {
    image = "docker-20-04"
    name = "rogue-01"
    region = "fra1"
    size = "s-1vcpu-1gb"
    ssh_keys = [data.digitalocean_ssh_key.wsl.id]
}

output "server_ipv4" {
    value = digitalocean_droplet.droplet.ipv4_address
}