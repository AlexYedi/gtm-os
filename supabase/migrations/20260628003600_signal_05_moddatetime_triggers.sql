create trigger set_modtime before update on signal.entities
  for each row execute function extensions.moddatetime(last_modified_at);
create trigger set_modtime before update on signal.events
  for each row execute function extensions.moddatetime(last_modified_at);
create trigger set_modtime before update on signal.topics
  for each row execute function extensions.moddatetime(last_modified_at);
create trigger set_modtime before update on signal.signals
  for each row execute function extensions.moddatetime(last_modified_at);
create trigger set_modtime before update on signal.relations
  for each row execute function extensions.moddatetime(last_modified_at);
create trigger set_modtime before update on signal.source_state
  for each row execute function extensions.moddatetime(updated_at);
