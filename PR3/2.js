document.addEventListener('DOMContentLoaded', () => {

    const copyBtn = document.getElementById('copyBtn');
    const menuLinks = document.querySelectorAll('.menu-link');
    const targetP = document.getElementById('targetParagraph');

    copyBtn.addEventListener('click', () => {
        const menuItemsText = Array.from(menuLinks).map(link => link.textContent).join(', ');
        targetP.textContent +=  ` [Добавлено: ${menuItemsText}]`;
    });

    const styleBtn = document.getElementById('styleBtn');

    styleBtn.addEventListener('click', () => {
        const links = document.querySelectorAll('.menu-link');
        links.forEach(link => {
            link.style.color = 'darkorange';
            link.style.fontWeight = 'bold';
            link.style.textTransform = 'uppercase';
        });
    });

    const searchInput = document.getElementById('searchInput');
    const originalNames = Array.from(menuLinks).map(link => link.textContent);

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();

        menuLinks.forEach((link, index) => {
            const text = originalNames[index];
            
            if (query && text.toLowerCase().includes(query.toLowerCase())) 
            {
                const regex = new RegExp(`(${query})`, 'gi');
                link.innerHTML = text.replace(regex, '<span class="highlight">$1</span>');
            } 
            else 
            {
                link.textContent = text;
            }
        });
    });
});