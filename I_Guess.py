import random


def play():
    secret = random.randint(1, 100)
    attempts = 0

    print("I'm thinking of a number between 1 and 100.")

    while True:
        guess_text = input("Your guess: ")

        if not guess_text.isdigit():
            print("Please enter a whole number.")
            continue

        guess = int(guess_text)
        attempts += 1

        if guess < secret:
            print("Higher!")
        elif guess > secret:
            print("Lower!")
        else:
            print(f"You got it! The number was {secret}. It took you {attempts} guesses.")
            break


if __name__ == "__main__":
    play()