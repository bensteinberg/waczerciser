# Waczerciser

Waczerciser is an experimental tool for opening, inspecting, editing, and packaging WARC and WACZ files.

## Installation

You can install waczerciser directly from GitHub:

```bash
npm install -g harvard-lil/waczerciser
```

Or run it without installing using npx:

```bash
npx github:harvard-lil/waczerciser
```

## Commands

### `waczerciser extract`

The extract command will take a WARC or WACZ file and extract the contents to a directory.

#### Example WARC extraction:

```bash
$ waczerciser extract example.warc.gz my_dir
Successfully extracted example.warc.gz to my_dir
$ tree my_dir
├── example.warc
├── file:
│   ├── dom-snapshot.html
│   ├── pdf-snapshot.pdf
│   ├── provenance-summary.html
│   └── screenshot.png
└── http:
    └── example.com
        ├── __index__.html
        └── favicon.ico
```

The WARC extractor represents the complete contents of the WARC file as files in the output directory.

Each Response record is extracted to a file based on the `warcTargetURI` field. For example, the `http://example.com` record is extracted to `http:/example.com/__index__.html`.

`extract` also writes out a metadata file, `example.warc`, which contains all non-Response records verbatim,
and all Response records with their response data replaced by a file path.

### `waczerciser create`

The `create` command will take a directory and create a WARC or WACZ file from it.
The command has three modes, depending whether it is passed a bare directory of files,
a previously-extracted WARC file, or a previously-extracted WACZ file.

#### Bare directory mode:

```bash
$ tree my_dir
└── main
    ├── __index__.html
    ├── index.css
    └── index.js
$ waczerciser create my_dir my_archive.warc.gz
Successfully created my_archive.warc.gz from my_dir
```

#### Example WACZ extraction:

```bash
$ waczerciser extract example.wacz my_dir
Successfully extracted example.wacz to my_dir
$ tree my_dir
├── archive
│   ├── data
│   │   ├── data.warc
│   │   ├── file:
│   │   │   ├── dom-snapshot.html
│   │   │   ├── pdf-snapshot.pdf
│   │   │   ├── provenance-summary.html
│   │   │   └── screenshot.png
│   │   └── http:
│   │       └── example.com
│   │           ├── __index__.html
│   │           └── favicon.ico
│   └── data.warc.gz
├── datapackage-digest.json
├── datapackage.json
├── indexes
│   └── index.cdx
└── pages
    └── pages.jsonl
```

When `extract` is given a WACZ file, it will extract the entire contents of the WACZ file, and then extract
each WARC file within it.

## Limitations

* Multiple Response records with the same URL are not yet supported.

## Development Setup

To set up the project locally for development:

```bash
# Clone the repository
git clone https://github.com/harvard-lil/waczerciser.git
cd waczerciser

# Install dependencies
npm install

# Build the project
npm run build

# Run the CLI
npm start
``` 