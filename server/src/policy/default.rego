package paperclip.authz

default allow := false

allow if {
  input.actor.type == "board"
  input.actor.source == "local_implicit"
}

allow if {
  input.actor.type == "board"
  input.actor.isInstanceAdmin == true
}

allow if {
  input.actor.type == "board"
  input.company_id == input.allowed_company_ids[_]
}

allow if {
  input.actor.type == "agent"
  input.actor.companyId == input.company_id
}
