pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Land {
    uint256 land_wei_price = 1000000000000;
    uint256 unit_wei_price = 10000000000;
    uint256 unit_gold_price = 100000;
	uint256 blocks_per_round = 4000;
	uint256 deployed_at_block;
	uint256 public ending_balance;
	uint256 public pool_nom = 9;
	uint256 public pool_div = 10;

    uint8 max_upgrades = 3;
	uint256 public passable_threshold = 121;
	uint8 victory_threshold = 169;
	uint256 threshold_increment = 6;
	uint8 max_units = 99;
	uint32 total_victory_tiles_owned;
    uint32 treatyID;
	bool firstWithdraw = true;
    IERC20 rewardToken;
    
    mapping(int64 => mapping(int64 => uint8)) public tile_development_level;
    mapping(int64 => mapping(int64 => address payable)) public tile_owner;
    mapping(int64 => mapping(int64 => uint8)) public units_on_tile;
    mapping(address => uint256) gold_balances;
    mapping(address => uint256) public gold_per_second;
	mapping(address => uint256) last_GPH_update_time;
	mapping(address => uint32) public victory_tiles_owned;
	mapping(address => bool) public withdrew;
	mapping(int64 => mapping(int64 => uint256)) market_price;

	constructor (IERC20 reward_token) {
		deployed_at_block = block.number;
		rewardToken = reward_token;
	}

	function dep() public view returns (uint256){
		return deployed_at_block;
	}

	function get_passable_threshold() public view returns(uint256){
		if((block.number - deployed_at_block)/blocks_per_round > 8){return victory_threshold;}
		return (passable_threshold + (block.number - deployed_at_block)/blocks_per_round * threshold_increment);
	}

	function get_season_ended() public view returns(bool){
		return get_passable_threshold() >= victory_threshold;
	}
    
	function withdraw_winnings() public payable{
		require(get_season_ended(), 'Season hasnt ended');
		require(!withdrew[msg.sender], 'Already withdrew');
		if(firstWithdraw){
			firstWithdraw = false;
			ending_balance = address(this).balance;
		}
		withdrew[msg.sender] = true;
		payable(msg.sender).transfer(get_winnings());
	}

	function get_winnings() public view returns(uint256){
		if(total_victory_tiles_owned == 0){ return 0; }
		if(ending_balance == 0){ return address(this).balance*pool_nom/pool_div * victory_tiles_owned[msg.sender] / total_victory_tiles_owned; }
		return ending_balance*pool_nom/pool_div * victory_tiles_owned[msg.sender] / total_victory_tiles_owned;
	}
	
	function award(address payable a, uint256 amt) external {
	    require(msg.sender == address(rewardToken), 'sender wasnt reward token address');
	    a.transfer(amt);
	}

	function get_pool_total() public view returns(uint256){
		if(get_season_ended()){ return ending_balance*pool_nom/pool_div; }
		return address(this).balance*pool_nom/pool_div;
	}

    function get_gold_value_of_tile(int64 x, int64 y) public view returns(int64){
		return 10000/get_tile(x,y);
    }
	function get_gold(address a) public view returns(uint){
		return gold_balances[a] + gold_per_second[a]*(block.timestamp - last_GPH_update_time[a]);
	}
	function get_land_price(uint8 x, uint8 y) public view returns(uint256){
		return land_wei_price;
	}
	function get_unit_price(uint8 x, uint8 y) public view returns(uint256){
		return unit_wei_price;
	}
	function get_height(int64 x, int64 y) public view returns(int64){
		return 1;// + (get_tile(x, y) - passable_threshold)/threshold_increment;
	}

    function transfer_gold(address to, uint256 gold) public {
        //TODO: overflow check here
        require(gold_balances[msg.sender] >= gold, 'Insufficient gold');
        gold_balances[msg.sender] -= gold;
        gold_balances[to] += gold;
		emit Gold_Transferred(msg.sender, to, gold);
    }

	//noise
	int64 constant max = 256;
    function integer_noise(int64 n) public pure returns(int64) {
        n = (n >> 13) ^ n;
        int64 nn = (n * (n * n * 60493 + 19990303) + 1376312589) & 0x7fffffff;
        return ((((nn * 100000)) / (1073741824)))%max;
    }

    function local_average_noise(int64 x, int64 y) public pure returns(int64) {
        int64 xq = x + ((y-x)/3);
        int64 yq = y - ((x+y)/3);

        int64 result =
        ((integer_noise(xq) + integer_noise(yq-1))) //uc
        +   ((integer_noise(xq-1) + integer_noise(yq))) //cl
        +   ((integer_noise(xq+1) + integer_noise(yq))) //cr
        +   ((integer_noise(xq) + integer_noise(yq+1))); //lc

        return result*1000/8;
    }

    int64 constant iterations = 5;

    function stacked_squares(int64 x, int64 y) public pure returns(int64) {

        int64 accumulator;
        for(int64 iteration_idx = 0; iteration_idx < iterations; iteration_idx++){
            accumulator +=  integer_noise((x * iteration_idx) + accumulator + y) +
            integer_noise((y * iteration_idx) + accumulator - x);
        }

        return accumulator*1000/(iterations*2);

    }

    function get_tile(int64 x, int64 y) public pure returns (int64) {
        return (local_average_noise(x/4,y/7) + stacked_squares(x/25,y/42))/2000;
    }

	event Land_Bought(uint8 indexed x, uint8 indexed y, address indexed new_owner, uint16 new_population, uint8 development_level);
    event Land_Transferred(uint8 indexed x, uint8 indexed y, address indexed new_owner);
	event Gold_Transferred(address from, address to, uint gold);
    event New_Population(uint8 indexed x, uint8 indexed y, uint16 new_population);	
	event Market_Posted(uint8 indexed x, uint8 indexed y, address indexed poster, uint256 price);
	event Market_Bought(uint8 indexed x, uint8 indexed y, address indexed buyer);
}