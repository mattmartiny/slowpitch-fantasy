using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasySlowpitchApi.Data;
using FantasySlowpitchApi.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FantasySlowpitchApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("state")]
    public class StateController : ControllerBase
    {
        private readonly AppDbContext _db;

        public StateController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var state = await _db.UserStates.FindAsync(Guid.Parse(userId!));

            if (state == null)
                return Ok(new { });

            return Ok(state.StateJson);

        }
    }
}
