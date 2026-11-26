# Lab 4 — Secure Connect and Communication Platform

**Course:** Web Dev III | **Unit:** 4 

A Node.js + Express backend demonstrating password hashing, JWT authentication, protected routes, role-based access control, Notes CRUD, Socket.IO chat, and Node.js EventEmitter events.

## Screenshots and Output Evidence

The following screenshots demonstrate the successful execution and functionality of the Secure Connect and Communication Platform.

### 1. User Signup
Demonstrates successful user registration with password hashing using bcrypt and JWT generation.

![User Signup](./screenshots/signup.png)

### 2. User Login
Demonstrates successful authentication using registered credentials and JWT token generation.

![User Login](./screenshots/login.png)

### 3. Unauthorized Access
Demonstrates that protected API routes reject requests without a valid JWT token, returning `401 Unauthorized`.

![Unauthorized Access](./screenshots/Unauthorised_access.png)

### 4. Authorized Access
Demonstrates successful access to a protected profile route using a valid JWT Bearer token.

![Authorized Access](./screenshots/authorized.png)

### 5. Create Note
Demonstrates creating a personal note through the authenticated Notes API.

![Create Note](./screenshots/create_note.png)

### 6. Retrieve Notes
Demonstrates retrieving the authenticated user's saved notes.

![Retrieve Notes](./screenshots/get_note.png)

### 7. Update Note
Demonstrates updating an existing note using the PUT method.

![Update Note](./screenshots/update_note.png)

### 8. Delete Note
Demonstrates deleting an existing note using the DELETE method.

![Delete Note](./screenshots/delete_note.png)

### 9. Real-Time Chat Communication
Demonstrates real-time, bidirectional messaging between two authenticated clients using Socket.IO.

![Real-Time Chat](./screenshots/real_time_chat.png)

Browser view from both the tokens

### Aarav Chat
![Real-Time Chat 1](./screenshots/chat1.png)

### Rahul Chat
![Real-Time Chat 2](./screenshots/chat2.png)

### 10. Event-Driven Activity
Demonstrates Node.js EventEmitter functionality through signup and login events displayed in the server console.

![EventEmitter Activity](./screenshots/event_emitter.png)

### 11. Role-Based Access Control (RBAC)
Demonstrates authorization restrictions for administrative resources based on user roles.

![RBAC](./screenshots/rbac.png)