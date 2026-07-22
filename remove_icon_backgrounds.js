const fs = require('fs');
const path = require('path');

const directoryToSearch = path.join(__dirname, 'src', 'app', '(portal)');
const componentsDirectory = path.join(__dirname, 'src', 'components');

const regexHeroIcon = /<div\s+className="[^"]*h-12 w-12 rounded-2xl bg-primary\/10 border border-primary\/20 flex items-center justify-center shadow-inner shrink-0">\s*<([A-Za-z0-9]+)\s+className="[^"]*h-6 w-6 text-primary"[^\/>]*\/>\s*<\/div>/g;
const regexEmptyStateIcon = /<div\s+className="[^"]*flex h-16 w-16 items-center justify-center rounded-2xl bg-muted\/60 text-muted-foreground">\s*<([A-Za-z0-9]+)\s+className="[^"]*h-8 w-8 opacity-40"[^\/>]*\/>\s*<\/div>/g;
const regexPerformanceChartStar = /<div\s+className="[^"]*h-11 w-11 rounded-2xl bg-amber-500\/10 border border-amber-500\/20 flex items-center justify-center shadow-inner">\s*<([A-Za-z0-9]+)\s+className="[^"]*h-[0-9]+ w-[0-9]+ text-amber-500"[^\/>]*\/>\s*<\/div>/g;
const regexHeroDashboard = /<div\s+className="[^"]*h-12 w-12 rounded-2xl bg-primary\/10 border border-primary\/20 flex items-center justify-center shadow-inner shrink-0">\s*<([A-Za-z0-9]+)\s+className="[^"]*h-6 w-6 text-primary"[^\/>]*\/>\s*<\/div>/g;
const regexSidebarIconActive = /bg-linear-to-r from-primary to-primary\/80 text-primary-foreground shadow-lg shadow-primary\/25/g;
const regexSidebarIconInactive = /text-sidebar-foreground\/70 hover:bg-linear-to-r hover:from-primary\/10 hover:to-primary\/5 hover:text-sidebar-foreground hover:shadow-md/g;

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

      // Replace hero icons
      content = content.replace(regexHeroIcon, (match, iconName) => {
        return `<div className="flex items-center justify-center shrink-0">
                <${iconName} className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>`;
      });

      // Replace empty state icons
      content = content.replace(regexEmptyStateIcon, (match, iconName) => {
        return `<div className="flex items-center justify-center text-muted-foreground">
              <${iconName} className="h-12 w-12 opacity-50" strokeWidth={1.5} />
            </div>`;
      });

      // Replace performance chart star (amber background)
      content = content.replace(regexPerformanceChartStar, (match, iconName) => {
        return `<div className="flex items-center justify-center shrink-0">
                <${iconName} className="h-8 w-8 text-amber-500 drop-shadow-sm" strokeWidth={1.5} />
              </div>`;
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated icons in: ${fullPath}`);
      }
    }
  }
}

console.log("Processing portal pages...");
processDirectory(directoryToSearch);
console.log("Processing components...");
processDirectory(componentsDirectory);
console.log("Done.");
