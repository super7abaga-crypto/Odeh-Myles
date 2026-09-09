# Odeh-Myles

A collection of small Python scripts, built while learning core programming
fundamentals — loops, conditionals, randomness, and command-line arguments.

# Scripts

I_Guess.py — Number Guessing Game

The computer picks a secret number between 1 and 100, and you try to guess
it. After each guess, it tells you "Higher!" or "Lower!" until you find it.

```bash
python3 I_Guess.py
```

YouGuess.py — Computer Guesses Your Number

Flips the roles: you think of a number, and the computer guesses it using
*binary search* — always guessing the midpoint of the remaining possible
range, so it never needs more than 7 guesses for a number between 1 and 100.

```bash
python3 YouGuess.py
```
Answer each guess with `h` (too high), `l` (too low), or `c` (correct).

# PassGen.py — Random Password Generator

Generates cryptographically random passwords using Python's `secrets`
module (not `random`, which isn't safe for anything security-related).

```bash
python3 PassGen.py                   # 16 chars, letters + digits + symbols
python3 PassGen.py  --length 24      # custom length
python3 PassGen.py  --no-symbols     # letters and digits only
python3 PassGen.py  --count 5        # generate multiple at once
```

# Requirements

Python 3 — no external packages needed for any of these scripts.
