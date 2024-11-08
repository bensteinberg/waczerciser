# Waczerciser

Waczerciser is an experimental tool for opening, inspecting, editing, and re-packaging WARC and WACZ files.

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

#### Example WARC extraction

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

Each Response record is extracted to a file based on the `warcTargetURI` field. For example, the `http://example.com` record is extracted to `http:/example.com/__index__.html`.

`extract` also writes out a metadata file, `example.warc`, which contains all non-Response records verbatim, and all Response records with their response data replaced by a file path.

#### Example WACZ extraction

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

### `waczerciser create`

The `create` command will take a directory and create a WARC or WACZ file from it.
The command can be passed a bare directory of files,
a previously-extracted WARC file, or a previously-extracted WACZ file:

#### Re-compressing a previously-extracted WARC or WACZ file

```bash
$ waczerciser create my_unpacked_warc my_archive.warc.gz
Successfully created my_archive.warc.gz from my_unpacked_warc
$ waczerciser create my_unpacked_wacz my_archive.wacz
Successfully created my_archive.wacz from my_unpacked_wacz
```

In these examples, the `create` command will re-compress the WARC or WACZ file,
including any edits made to the extracted files.

#### Bare directory mode

With the `--as-files` flag, the `create` command will create a WARC file from all files in the directory,
rather than requiring a previously-extracted WARC or WACZ file as input.
(This example uses the [warctools package](https://github.com/internetarchive/warctools) to show the WARC contents.)

```bash
$ tree my_dir
└── main
    ├── __index__.html
    ├── index.css
    └── index.js
$ waczerciser create my_dir my_archive.warc.gz --as-files
Successfully created my_archive.warc.gz from my_dir
$ warcdump my_archive.warc.gz | grep WARC-Target-URI
        WARC-Target-URI:file:///main/
        WARC-Target-URI:file:///main/index.css
        WARC-Target-URI:file:///main/index.js
```

#### The `--watch` flag

The `--watch` flag will watch the input directory for changes and rebuild the WARC or WACZ file as needed.

### `waczerciser serve`

The `serve` command will start a local HTTP server and serve an existing WARC or WACZ file, or a directory of files to be built into a WARC or WACZ file. Examples:

```bash
$ waczerciser serve my_archive.wacz
$ waczerciser serve my_archive.warc.gz
$ waczerciser serve my_extracted_wacz
$ waczerciser serve my_extracted_warc
$ waczerciser serve my_web_files
```

#### Flags

The `serve` command supports the following flags:

* `--format`: Specify the format of the input directory, if `serve` is unable to infer it from the directory contents. May be `wacz`, `warc`, or `files`.
* `--port`: Specify the port number to run the server on. Defaults to 8080.
* `--url`: Specify the URL from the archive to replay.
* `--output-file`: Specify an output file to write when `serve` is given a directory of files. If not provided, the archive will be written to a temporary file.

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

# Run from source
npm run dev -- extract ...

# Run tests
npm run test

# Build the project
npm run build
``` 