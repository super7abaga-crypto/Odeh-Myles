const form = document.querySelector("#userForm");
const message = document.querySelector("#message");
const userList = document.querySelector("#userList");

const editForm = document.querySelector("#editForm");
const editId = document.querySelector("#editId");
const editName = document.querySelector("#editName");
const editEmail = document.querySelector("#editEmail");
const cancelEdit = document.querySelector("#cancelEdit");

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

        listItem.textContent = `${user.name} - ${user.email} `;

        const editButton = document.createElement("button");

editButton.textContent = "Edit";

editButton.addEventListener("click", function () {
    editId.value = user.id;
    editName.value = user.name;
    editEmail.value = user.email;

    editForm.style.display = "block";
});

    const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async function () {
    
    const confirmed = confirm(
        `Are you sure you want to delete ${user.name}?`
    );

    if (!confirmed) {
        return;
    }

    await fetch(`http://127.0.0.1:8000/users/${user.id}`, {
        method: "DELETE"
    });

    loadUsers();
});

        listItem.appendChild(editButton);
        listItem.appendChild(deleteButton);

        userList.appendChild(listItem);
    });

    } catch (error) {
        userList.textContent = "Could not load users.";
    }
}

loadUsers();

editForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = editId.value;

    const response = await fetch(`http://127.0.0.1:8000/users/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: editName.value,
            email: editEmail.value
        })
    });

    const data = await response.json();

    if (response.ok) {
        editForm.style.display = "none";
        message.textContent = "User updated successfully!";

        loadUsers();
    } else {
        message.textContent = data.detail;
    }
});