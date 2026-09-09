def computer_guess():
    low, high = 1, 100
    attempts = 0

    print("Think of a number between 1 and 100 (don't tell me!).")
    print("I'll guess, and you tell me: h = too high, l = too low, c = correct.\n")

    while low <= high:
        guess = (low + high) // 2  # Half of the remaining range
        attempts += 1

        print(f"Range is [{low}, {high}]. My guess: {guess}")
        response = input("h / l / c? ").strip().lower()

        if response == "c":
            print(f"\nGot it in {attempts} guesses!")
            return
        elif response == "h":
            high = guess - 1
        elif response == "l":
            low = guess + 1
        else:
            print("Please answer h, l, or c.")
            attempts -= 1
    print("That doesn't seem possible — did the responses contradict each other?")


if __name__ == "__main__":
    computer_guess()