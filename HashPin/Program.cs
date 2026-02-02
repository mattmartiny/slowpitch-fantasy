using BCrypt.Net;

Console.Write("Enter PIN: ");
var pin = Console.ReadLine();

var hash = BCrypt.Net.BCrypt.HashPassword(pin);
Console.WriteLine(hash);
