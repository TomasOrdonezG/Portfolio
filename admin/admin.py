import os, json
from pathlib import Path
from firebase_admin import credentials, initialize_app, firestore, storage

STORAGE_DIR_NAME = "storage"

CONTENT_PATH = os.path.join(os.path.curdir, "content")
SHADERS_PATH = os.path.join(os.path.curdir, "shaders")
STORAGE_PATH = os.path.join(os.path.curdir, STORAGE_DIR_NAME)

SHADERS_COLLECTION = "shaders"
FILES_COLLECTION = "files"
DIR_STRUCTURE_COLLECTION = "dir-structure"
DIR_STRUCTURE_DOCUMENT = "root"

ORDER_FILE_NAME = ".order.json"

cred = credentials.Certificate("./serviceAccountKey.json")
initialize_app(cred, {
    'storageBucket': 'tomasportfolio-106ad.firebasestorage.app'
})

db = firestore.client()
bucket = storage.bucket()

def write_shaders():
    """
    Write shader code to firestore database
    """
    for shader_filename in os.listdir(SHADERS_PATH):
        shader_filepath = os.path.join(SHADERS_PATH, shader_filename)
        with open(shader_filepath, "r") as shader_file:
            shader_data = { "code": shader_file.read() }
            doc_ref = db.collection(SHADERS_COLLECTION).document(shader_filename)
            doc_ref.set(shader_data)

def filepath_to_id(filepath):
    """
    Maps a file path to that file's ID in the database.
    """
    return filepath.replace(CONTENT_PATH, "").replace("/", "\\")

def sort_content(content, order):
    """
    Sorts the files and subdirs according to an order.
    """
    def sort_selection(items, order_list):
        priority = { name: i for i, name in enumerate(order_list) }
        return sorted(
            items,
            key=lambda x: priority.get(x["name"], len(priority))
        )
    content["files"] = sort_selection(content["files"], order["files"])
    content["subdirs"] = sort_selection(content["subdirs"], order["subdirs"])

def get_contents():
    """
    Creates a dictionary containing the entire directory structure as well as a list of all files.
    """
    
    dir_structure = {}
    filepaths = []

    def DFS(dirpath, cur_dir_structure):
        cur_dir_structure["subdirs"] = []
        cur_dir_structure["files"] = []

        for name in os.listdir(dirpath):
            subpath = os.path.join(dirpath, name)
            if os.path.isdir(subpath):
                subdir_data = { "name": name }
                cur_dir_structure["subdirs"].append(subdir_data)
                DFS(subpath, cur_dir_structure["subdirs"][-1])
            else:
                if name.startswith("."):
                    continue
                subfile_data = { "name": name, "id": filepath_to_id(subpath) }
                cur_dir_structure["files"].append(subfile_data)
                filepaths.append(subpath)

        # Sort content
        order_filepath = os.path.join(dirpath, ORDER_FILE_NAME)
        if os.path.exists(order_filepath):
            with open(order_filepath, "r") as f:
                sort_content(cur_dir_structure, json.load(f))

    dir_structure["name"] = ""
    DFS(CONTENT_PATH, dir_structure)
    return dir_structure, filepaths

def write_dir_structure(dir_structure):
    """
    Given a directory structure, writes it to the database.
    """
    doc_ref = db.collection(DIR_STRUCTURE_COLLECTION).document(DIR_STRUCTURE_DOCUMENT)
    try:
        doc_ref.set(dir_structure)
    except Exception as e:
        print("Failed to write directory structure to database: ", e)
        raise

def write_files(filepaths):
    """
    Given a list of file paths, writes the contents of the files to the database.
    """
    for filepath in filepaths:
        file_id = filepath_to_id(filepath)
        doc_ref = db.collection(FILES_COLLECTION).document(file_id)

        with open(filepath, "r") as f:
            try:
                doc_ref.set({"data": f.read(), "name": os.path.basename(filepath)})
            except Exception as e:
                print(f"Failed to write file '{filepath}' to database: ", e)
                raise

def update_storage():
    """
    Uploads files to firebase storage
    """

    for f in Path(STORAGE_PATH).rglob("*"):
        if not f.is_file():
            continue
 
        filepath = str(f)
        blobName = filepath.replace(STORAGE_DIR_NAME + "/", "")
    
        blob = bucket.blob(blobName)
        blob.upload_from_filename(filepath)

if __name__ == "__main__":
    dir_structure, filepaths = get_contents()
    write_dir_structure(dir_structure)
    write_files(filepaths)
    write_shaders()
    update_storage()
