const form = document.querySelector("#userForm");
const message = document.querySelector("#message");
const userList = document.querySelector("#userList");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.querySelector("#name").value;
    const email = document.querySelector("#email").value;

    try {
        const response = await fetch("http://127.0.0.1:8000/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email
            })
        });

        const data = await response.json();

        if (response.ok) {
            message.textContent = "User created successfully!";
            form.reset();
        } else {
            message.textContent = data.detail;
        }

    } catch (error) {
        message.textContent = "Could not connect to the server.";
    }
});

async function loadUsers() {
    try {
        const response = await fetch("http://127.0.0.1:8000/users");

        const users = await response.json();

        userList.innerHTML = "";

        users.forEach(function (user) {
            const listItem = document.createElement("li");

            listItem.textContent = `${user.name} - ${user.email}`;

            userList.appendChild(listItem);
        });

    } catch (error) {
        userList.textContent = "Could not load users.";
    }
}

loadUsers();