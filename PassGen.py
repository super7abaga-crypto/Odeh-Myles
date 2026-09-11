import argparse
import secrets
import string


def generate_password(length: int, use_symbols: bool) -> str:
    alphabet = string.ascii_letters + string.digits
    if use_symbols:
        alphabet += "!@#$%^&*()-_=+"

    return "".join(secrets.choice(alphabet) for _ in range(length))


def main():
    parser = argparse.ArgumentParser(description="Generate a random password")
    parser.add_argument("--length", type=int, default=16, help="Password length (default: 16)")
    parser.add_argument("--count", type=int, default=1, help="How many passwords to generate")
    parser.add_argument("--no-symbols", action="store_true", help="Exclude symbols like !@#$")

    args = parser.parse_args()

    if args.length < 4:
        print("Length should be at least 4 for a meaningful password.")
        return

    for _ in range(args.count):
        print(generate_password(args.length, use_symbols=not args.no_symbols))


if __name__ == "__main__":
    main()