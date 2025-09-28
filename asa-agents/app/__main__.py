from uvicorn import run


def main() -> None:
    run("app.main:app", host="0.0.0.0", port=7070, reload=True)


if __name__ == "__main__":
    main()


