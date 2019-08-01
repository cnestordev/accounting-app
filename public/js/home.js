$("#darkmode-button").click(function(){
    if($("#styles").attr("href") === "/css/darkmode.css"){
	$("#styles").attr("href", "/css/styles.css");
} else if ($("#styles").attr("href") === "/css/styles.css") {
	$("#styles").attr("href", "/css/darkmode.css");
}
  });