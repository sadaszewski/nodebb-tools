# nodebb-tools
Useful CLI tools for NodeBB management

- Batch edit category properties
- Dump database (any backend) to a JSON file
- Restore database (any backend) from a JSON file

Because dump/restore are backend-agnostic, they can be used for switching between the supported backend (redis, mongo, postgres). You have to perform a dump while your old backend is configured, then reconfigure NodeBB to your target backend and then restore the JSON dump.
