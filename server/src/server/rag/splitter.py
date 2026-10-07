from langchain_text_splitters import RecursiveCharacterTextSplitter


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    separators=[
        "\n\n",
        "\n",
        ". ",
        " ",
        "",
    ],
)


def split_text(text: str) -> list[str]:
    return text_splitter.split_text(text)