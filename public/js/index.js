var expand = document.querySelectorAll("span.expand")


for(var i = 0; i < expand.length; i++){
	let x = [i]
	document.querySelectorAll("span.expand")[i].onclick = function(){
		expandMe(x);
	}
}

function expandMe (x){
	document.querySelectorAll("div.main-message-body")[x].classList.toggle("cut");
	document.querySelectorAll("div.input")[x].classList.toggle("show");
	document.querySelectorAll("div.now")[x].classList.toggle("overlay");
}

// document.querySelectorAll("div.message-overlay-div")[this].onclick=function(){
// 	function(){
// 		this.classList.toggle("message-overlay");
// 	}
// }

$(document).ready(function(){
  $(".fa-plus").click(function(){
    $(".compose-box").slideToggle("fast");
    $(".fa-plus").toggleClass("fa-plus-rotated");
  });
  $(".fa-chevron-down").click(function(){
  	$(this).toggleClass("fa-chevron-active");
  });
});