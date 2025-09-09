import backend.services.machines_service as machines_service

def handle_get_machines():
    return machines_service.get_machines_list()
