# Tomas Ordonez Gonzalez - Portfolio

This is my personal website used to showcase my projects, academic performance, work experience, etc.

The content is shown within files in an file system navigated through a TUI app on a retro computer.

![admin/storage/images/portfolio.png](image of the site)

The file system is updated from the actual files and directories in `admin/content/`. Running `admin/admin.py` writes the contents to the database, which the frontend then reads from.

Because WebGL does not so easily allow the DOM to be rendered to a texture, the UI is instead drawn using an HTML canvas. This allows WebGL to easily create a texture from it, which is then used by the fragment shader to give the "old computer screen" visual effect to the final rendered frame.

# Controls

#### Navigation

- `UpArrow` and `DownArrow`: Change highlighted file.
- `RightArrow`: Step into the highlighted directory or view highlighted file.
- `LeftArrow`: Step into the parent directory (unless in root directory already).
- `Enter`: Run the highlighted file.

#### File Viewing
- `UpArrow` and `DownArrow`: Scroll.
- `LeftArrow`: Return to file manager.

# Technologies Used
- Backend hosted using Firebase.
- Frontend written in pure JavaScript.
- UI rendered on an HTML canvas.
- Old TV effect done using a GLSL fragment shader for WebGL.
- Admin program written in python.

# Credits
- Old screen fragment shader adapted from [ColdbergTVShader](https://www.shadertoy.com/view/lsfXzM).
- Grain image used in fragment shader taken from [here](https://www.shadertoy.com/media/a/f735bee5b64ef98879dc618b016ecf7939a5756040c2cde21ccb15e69a6e1cfb.png).
- ASCII art text generated using [Text to ASCII Art Generator (TAAG)](https://patorjk.com/software/taag/#p=display&f=Small+Slant&t=Tomas+Ordonez+Gonzalez&x=none&v=4&h=4&w=80&we=false).
- Colors and overall theme inspired by terminal emulator [cool-retro-term](https://github.com/Swordfish90/cool-retro-term).
- File system navigation and layout inspired by [Yazi file manager](https://github.com/sxyazi/yazi).
- Beep sound [Oldbeep.wav](https://freesound.org/people/412lop/sounds/687403/) by Freesound user *412lop*.
