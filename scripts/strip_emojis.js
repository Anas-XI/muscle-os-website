const fs = require('fs');
const path = require('path');

function stripEmojis(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Preserve important injury markers
    content = content.replace(/🟢/g, '__GREEN_CIRCLE__');
    content = content.replace(/🟡/g, '__YELLOW_CIRCLE__');
    content = content.replace(/🔴/g, '__RED_CIRCLE__');
    content = content.replace(/⛔/g, '__NO_ENTRY__');

    // Using Unicode property escapes to match emojis. 
    const emojiRegex = /\p{Emoji_Presentation}/gu;
    
    // Also remove some specific symbols that might not fall strictly under Emoji_Presentation but are used as icons
    const otherSymbols = /[🧘🔥⚡⏸⇄💡🚀🏆📈🛡💪🎯🥗🙂⚠️✓×]/gu;

    let newContent = content.replace(emojiRegex, '').replace(otherSymbols, '');
    
    // Fix up some common double spaces left after removing emojis
    newContent = newContent.replace(/  +/g, ' ').replace(/ \n/g, '\n');

    // 2. Restore important injury markers
    newContent = newContent.replace(/__GREEN_CIRCLE__/g, '🟢');
    newContent = newContent.replace(/__YELLOW_CIRCLE__/g, '🟡');
    newContent = newContent.replace(/__RED_CIRCLE__/g, '🔴');
    newContent = newContent.replace(/__NO_ENTRY__/g, '⛔');

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Stripped emojis from: ${filePath}`);
        return 1;
    }
    return 0;
}

function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        try {
            filelist = walkSync(dirFile, filelist);
        } catch (err) {
            if (err.code === 'ENOTDIR' || err.code === 'EBADF') {
                if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.json')) {
                    filelist.push(dirFile);
                }
            }
        }
    });
    return filelist;
}

const baseDir = path.join('e:', 'MoS', 'website');
const files = walkSync(baseDir);
let modified = 0;

files.forEach(f => {
    modified += stripEmojis(f);
});

console.log(`Finished. Modified ${modified} files.`);
