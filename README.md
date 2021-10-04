# nodebb-tools
Useful CLI tools for NodeBB management

- Batch edit category properties
- Dump database (any backend) to a JSON file
- Restore database (any backend) from a JSON file
- Reset password for any user without using the built-in mechanism (no emails, no reset tokens, etc.)

Because dump/restore are backend-agnostic, they can be used for switching between the supported backends (redis, mongo, postgres). You have to perform a dump while your old backend is configured, then reconfigure NodeBB to your target backend and then restore the JSON dump.
