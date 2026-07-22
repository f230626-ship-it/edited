const fs = require('fs');
const path = require('path');

const directoryToSearch = path.join(__dirname, 'src', 'app', '(portal)');

const regexKpiIcon = /<div className=\{cn\("h-8 w-8 rounded-lg flex items-center justify-center", kpi\.iconBg\)\}>\s*<Icon className=\{cn\("h-4 w-4", kpi\.iconText\)\} strokeWidth=\{2\} \/>\s*<\/div>/g;
const regexKpiIcon2 = /<div className=\{cn\("h-8 w-8 rounded-lg flex items-center justify-center shadow-sm", kpi\.iconBg\)\}>\s*<Icon className=\{cn\("h-4 w-4", kpi\.iconText\)\} strokeWidth=\{2\} \/>\s*<\/div>/g;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      content = content.replace(regexKpiIcon, (match) => {
        return `<div className="flex items-center justify-center shrink-0">
                    <Icon className={cn("h-5 w-5 drop-shadow-sm", kpi.iconText)} strokeWidth={2} />
                  </div>`;
      });
      content = content.replace(regexKpiIcon2, (match) => {
        return `<div className="flex items-center justify-center shrink-0">
                    <Icon className={cn("h-5 w-5 drop-shadow-sm", kpi.iconText)} strokeWidth={2} />
                  </div>`;
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated KPI icons in: ${fullPath}`);
      }
    }
  }
}

console.log("Processing portal pages for KPI cards...");
processDirectory(directoryToSearch);
console.log("Done.");
