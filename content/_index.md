---
---

**Purple** is a simple yet powerful data backend with support for:

* Key/value operations
* Counters and sets
* Flags (basically key/value pairs where the value is a Boolean)
* Caching (with TTL)

Purple is meant to abstract away complex and multifarious data interfaces in favor of a unified set of [simple operations](#operations).

## Use cases

Purple is designed for situations where you want a single storage backend shared by many processes—FaaS functions, microservices, etc.—with straightforward storage needs. Here are some example scenarios:

* You're building a video game and want to run CRUD operations on user data (username as key and JSON as the value) and increment and decrement point total counters for each user
* You're building a continuous integration system and need a persistent feature flag backend
* You're hacking on a 

Purple lets you do all of the above without needing to run multiple databases. If you *really* need to run BigTable plus Redshift plus Redis plus MongoDB, then Purple is not meant for you.

## Interfaces

You can run Purple as a [gRPC server](#grpc-server) or as an [HTTP server](#http-server) (both expose the same [operations](#operations)). There are currently Go client libraries for both gRPC and HTTP, and I hope to support other languages soon.

## Backends

There are currently three backends available for Purple:

* Memory (all data is lost upon server restart)
* Disk
* [Redis](https://redis.io)

## Operations
