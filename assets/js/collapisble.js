var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
        this.classList.toggle("collapsible-active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }

        // Update the button's text
        // Collapsed, right arrow: [text] &#9658;
        // Expanded, down arrow: [text] &#9660;
        if (this.classList.contains("collapsible-active")) {
            this.textContent = this.textContent.replace(/\s*[\u25B6\u25BC]\s*$/, '') + ' \u25BC';
        }
        else {
            this.textContent = this.textContent.replace(/\s*[\u25B6\u25BC]\s*$/, '') + ' \u25B6';
        }
        console.log(this.innerHTML);
        
        
    });
}