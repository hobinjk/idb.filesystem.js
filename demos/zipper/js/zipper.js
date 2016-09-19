zip.workerScriptsPath = "js/zip/";

/**
 * @param {String} e
 */
function reportError(e) {
  console.error(e);
}

/**
 * @param {FileSystemDirectoryReader} fileReader
 * @param {Function} resolve
 */
function getAllFiles(fileReader, resolve) {
  console.log('getAllFiles', fileReader);
  var allFiles = [];
  var pendingDirectories = 0;

  function getAllFilesRecur(entryReader) {
    pendingDirectories += 1;
    getAllFiles(entryReader, function(dirFiles) {
      allFiles = allFiles.concat(dirFiles);
      pendingDirectories -= 1;
      if (pendingDirectories === 0) {
        resolve(allFiles);
      }
    });
  }

  fileReader.readEntries(function(entries) {
    if (entries.length === 0) {
      if (pendingDirectories === 0) {
        resolve(allFiles);
      }
      return;
    }
    entries.forEach(function(entry) {
      if (entry.isFile) {
        allFiles.push(entry);
      } else {
        var entryReader = entry.createReader();
        getAllFilesRecur(entryReader);
      }
    });

    getAllFilesRecur(fileReader);
  }, reportError);
}


/**
 * @param {zip.ZipWriter} zipWriter
 * @param {Array<FileSystemFileEntry>} fileEntires
 * @param {Function} resolve
 */
function addFiles(zipWriter, fileEntries, resolve) {
  if (fileEntries.length === 0) {
    resolve();
    return;
  }
  var fileEntry = fileEntries.pop();

  console.log(fileEntry);
  fileEntry.file(function(file) {
    zipWriter.add(fileEntry.fullPath, new zip.BlobReader(file), function() {
      addFiles(zipWriter, fileEntries, resolve);
    });
  }, reportError);
}

/**
 * @param {FileSystemDirectoryEntry} root
 * @param {Function} resolve
 */
function createZip(root, resolve) {
  var reader = root.createReader();
  getAllFiles(reader, function(files) {
    zip.createWriter(new zip.BlobWriter(), function(writer) {
      addFiles(writer, files, function() {
        writer.close(function(blob) {
          resolve(new Blob([blob], {type: 'application/zip'}));
        });
      });
    });
  });
}

/**
 * @param {Blob} blob - zip file contents
 * @param {FileDirectoryEntry} root - directory into which to extract
 * @param {Function} resolve
 */
function expandZip(blob, root, resolve) {
  zip.createReader(new zip.BlobReader(blob), function(reader) {
    reader.getEntries(function(entries) {
      console.log(entries);
      entries.forEach(function(zipEntry) {
        root.getFile(zipEntry.filename, {create: true}, function(fileEntry) {
          fileEntry.createWriter(function(fileWriter) {
            zipEntry.getData(new zip.BlobWriter(), function(zipData) {
              fileWriter.onwriteend = resolve;
              fileWriter.onerror = reportError;
              fileWriter.write(zipData);
            });
          }, reportError);
        }, reportError);
      });
    });
  }, reportError);
}
