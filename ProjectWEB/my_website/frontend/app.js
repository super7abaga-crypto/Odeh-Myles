const form = document.querySelector("#userForm");
const message = document.querySelector("#message");
const userList = document.querySelector("#userList");
const usersHeading = document.querySelector("#users");
const userCount = document.querySelector("#userCount");
const editModal = document.querySelector("#editModal");
const closeModal = document.querySelector("#closeModal");

const editForm = document.querySelector("#editForm");
const editId = document.querySelector("#editId");
const editName = document.querySelector("#editName");
const editEmail = document.querySelector("#editEmail");
const cancelEdit = document.querySelector("#cancelEdit");

function showMessage(text) {
    message.textContent = text;
    message.style.display = "block";

    setTimeout(function () {
        message.style.display = "none";
    }, 5000);
}

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
            showMessage("User created successfully!");
            
            form.reset();
            loadUsers();

        } else {
            showMessage(data.detail);
        }

    } catch (error) {
        showMessage("Could not connect to the server.");
    }
});

async function loadUsers() {
    try {
        const response = await fetch("http://127.0.0.1:8000/users");

        const users = await response.json();

        usersHeading.textContent = `Users (${users.length})`;
        userCount.textContent = users.length;

        userList.innerHTML = "";

        if (users.length === 0) {
            userList.textContent = "No users yet. Create your first user above.";
            userList.classList.add("empty-message");
            return;
        }

        userList.classList.remove("empty-message");

        users.forEach(function (user) {

            const listItem = document.createElement("li");

            listItem.textContent = `${user.name} - ${user.email} `;

            const editButton = document.createElement("button");

            editButton.textContent = "Edit";

            editButton.addEventListener("click", function () {
            editId.value = user.id;
            editName.value = user.name;
            editEmail.value = user.email;

            editModal.style.display = "flex";
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
        editModal.style.display = "none";
        message.textContent = "User updated successfully!";

        loadUsers();
    } else {
        message.textContent = data.detail;
    }
});
    cancelEdit.addEventListener("click", function () {
        editModal.style.display = "none";
});
    closeModal.addEventListener("click", function () {
        editModal.style.display = "none";
});