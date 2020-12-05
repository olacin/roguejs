include .env

init:
	@terraform output -json | jq -r '"rogue-01 ansible_host=" + .server_ipv4.value' > inventory

configure: init
	@ansible-playbook --ask-vault-pass -i inventory playbook.yml --tags configuration

deploy: init
	@ansible-playbook --ask-vault-pass -i inventory playbook.yml --tags deployment

destroy:
	@terraform destroy -var="do_token=${DIGITALOCEAN_TOKEN}"

plan:
	@terraform plan -var="do_token=${DIGITALOCEAN_TOKEN}"

provision:
	@terraform apply -var="do_token=${DIGITALOCEAN_TOKEN}"