import firebase_admin, os
from firebase_admin import credentials
from firebase_admin import firestore

CONTENT_DIR = os.path.join(os.path.curdir, "content")
SHADERS_DIR = os.path.join(os.path.curdir, "shaders")

SHADERS_COLLECTION = "shaders"
FILES_COLLECTION = "files"
DIR_STRUCTURE_COLLECTION = "dir-structure"
DIR_STRUCTURE_DOCUMENT = "root"

cred = credentials.Certificate("./serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def write_shaders():
    """
    Write shader code to firestore database
    """
    for shader_filename in os.listdir(SHADERS_DIR):
        shader_filepath = os.path.join(SHADERS_DIR, shader_filename)
        with open(shader_filepath, "r") as shader_file:
            shader_data = { "code": shader_file.read() }
            doc_ref = db.collection(SHADERS_COLLECTION).document(shader_filename)
            doc_ref.set(shader_data)

def filepath_to_id(filepath):
    """
    Maps a file path to that file's ID in the database.
    """
    return filepath.replace(CONTENT_DIR, "").replace("/", "\\")

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
                subfile_data = { "name": name, "id": filepath_to_id(subpath) }
                cur_dir_structure["files"].append(subfile_data)
                filepaths.append(subpath)

    # TODO: Sort subdirs and files

    dir_structure["name"] = ""
    DFS(CONTENT_DIR, dir_structure)
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

if __name__ == "__main__":
    dir_structure, filepaths = get_contents()
    write_dir_structure(dir_structure)
    write_files(filepaths)
    write_shaders()